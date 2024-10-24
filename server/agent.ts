// SPDX-License-Identifier: Apache-2.0



// Load environment variables from agent/.env.local


// Debugging: Print the API Key to verify it's loaded


// Import necessary modules after loading env variables
import { WorkerOptions, cli, defineAgent, multimodal } from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import type {
  LocalParticipant,
  Participant,
  TrackPublication,
} from "@livekit/rtc-node";
import { RemoteParticipant, TrackSource } from "@livekit/rtc-node";
import { fileURLToPath } from "node:url";
import { v4 as uuidv4 } from "uuid";

function safeLogConfig(config: SessionConfig): string {
  const safeConfig = { ...config, openaiApiKey: "[REDACTED]" };
  return JSON.stringify(safeConfig);
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const participant = await ctx.waitForParticipant();

    await runMultimodalAgent(ctx, participant);
  },
});

type TurnDetectionType = {
  type: "server_vad";
  threshold?: number;
  prefix_padding_ms?: number;
  silence_duration_ms?: number;
};

interface SessionConfig {
  openaiApiKey: string;
  instructions: string;
  voice: string;
  temperature: number;
  maxOutputTokens?: number;
  modalities: string[];
  turnDetection: TurnDetectionType | null;
}

function parseSessionConfig(data: any): SessionConfig {
  return {
    openaiApiKey: data.openai_api_key || "",
    instructions: data.instructions || "",
    voice: data.voice || "",
    temperature: parseFloat(data.temperature || "0.8"),
    maxOutputTokens:
      data.max_output_tokens === "inf"
        ? Infinity
        : parseInt(data.max_output_tokens) || undefined,
    modalities: modalitiesFromString(data.modalities || "text_and_audio"),
    turnDetection: data.turn_detection ? JSON.parse(data.turn_detection) : null,
  };
}

function modalitiesFromString(
  modalities: string,
): ["text", "audio"] | ["text"] {
  const modalitiesMap: { [key: string]: ["text", "audio"] | ["text"] } = {
    text_and_audio: ["text", "audio"],
    text_only: ["text"],
  };
  return modalitiesMap[modalities] || ["text", "audio"];
}

function getMicrophoneTrackSid(participant: Participant): string | undefined {
  return Array.from(participant.trackPublications.values()).find(
    (track: TrackPublication) => track.source === TrackSource.SOURCE_MICROPHONE,
  )?.sid;
}

async function runMultimodalAgent(
  ctx: JobContext,
  participant: RemoteParticipant,
) {
  try {
    const metadata = JSON.parse(participant.metadata);
    const config = parseSessionConfig(metadata);

    // Debugging: Log the parsed config without sensitive data
    console.log(
      `Starting multimodal agent with config: ${safeLogConfig(config)}`,
    );

    if (!config.openaiApiKey) {
      console.error("OpenAI API Key is missing in the session config.");
      return;
    }

    // Initialize the OpenAI Realtime Model
    const model = new openai.realtime.RealtimeModel({
      apiKey: config.openaiApiKey,
      instructions: config.instructions,
      voice: config.voice,
      temperature: config.temperature,
      maxResponseOutputTokens: config.maxOutputTokens,
      modalities: config.modalities as ["text", "audio"] | ["text"],
      turnDetection: config.turnDetection,
    });

    const agent = new multimodal.MultimodalAgent({ model });
    const session = (await agent.start(
      ctx.room,
    )) as openai.realtime.RealtimeSession;

    session.conversation.item.create({
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Please begin the interaction with the user in a manner consistent with your instructions.",
        },
      ],
    });
    session.response.create();

    ctx.room.on(
      "participantAttributesChanged",
      (
        changedAttributes: Record<string, string>,
        changedParticipant: Participant,
      ) => {
        if (changedParticipant !== participant) {
          return;
        }
        const newConfig = parseSessionConfig({
          ...changedParticipant.attributes,
          ...changedAttributes,
        });

        session.sessionUpdate({
          instructions: newConfig.instructions,
          temperature: newConfig.temperature,
          maxResponseOutputTokens: newConfig.maxOutputTokens,
          modalities: newConfig.modalities as ["text", "audio"] | ["text"],
          turnDetection: newConfig.turnDetection,
        });
      },
    );

    async function sendTranscription(
      ctx: JobContext,
      participant: Participant,
      trackSid: string,
      segmentId: string,
      text: string,
      isFinal: boolean = true,
    ) {
      const transcription = {
        participantIdentity: participant.identity,
        trackSid: trackSid,
        segments: [
          {
            id: segmentId,
            text: text,
            startTime: BigInt(0),
            endTime: BigInt(0),
            language: "",
            final: isFinal,
          },
        ],
      };
      await (ctx.room.localParticipant as LocalParticipant).publishTranscription(
        transcription,
      );
    }

    session.on("response_done", (response: openai.realtime.RealtimeResponse) => {
      let message: string | undefined;
      if (response.status === "incomplete") {
        if (response.statusDetails?.reason) {
          const reason = response.statusDetails.reason;
          switch (reason) {
            case "max_output_tokens":
              message = "🚫 Max output tokens reached";
              break;
            case "content_filter":
              message = "🚫 Content filter applied";
              break;
            default:
              message = `🚫 Response incomplete: ${reason}`;
              break;
          }
        } else {
          message = "🚫 Response incomplete";
        }
      } else if (response.status === "failed") {
        if (response.statusDetails?.error) {
          switch (response.statusDetails.error.code) {
            case "server_error":
              message = `⚠️ Server error`;
              break;
            case "rate_limit_exceeded":
              message = `⚠️ Rate limit exceeded`;
              break;
            default:
              message = `⚠️ Response failed`;
              break;
          }
        } else {
          message = "⚠️ Response failed";
        }
      } else {
        return;
      }

      const localParticipant = ctx.room.localParticipant as LocalParticipant;
      const trackSid = getMicrophoneTrackSid(localParticipant);

      if (trackSid) {
        sendTranscription(
          ctx,
          localParticipant,
          trackSid,
          "status-" + uuidv4(),
          message,
        );
      }
    });
  } catch (error) {
    console.error("Error in runMultimodalAgent:", error);
  }
}

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));


// import {
//     type JobContext,
//     WorkerOptions,
//     cli,
//     defineAgent,
//     multimodal,
//   } from "@livekit/agents";
//   import * as openai from "@livekit/agents-plugin-openai";
//   import type {
//     LocalParticipant,
//     Participant,
//     TrackPublication,
//   } from "@livekit/rtc-node";
//   import { RemoteParticipant, TrackSource } from "@livekit/rtc-node";
//   import { fileURLToPath } from "node:url";
//   import { v4 as uuidv4 } from "uuid";
  
//   function safeLogConfig(config: SessionConfig): string {
//     const safeConfig = { ...config, openaiApiKey: "[REDACTED]" };
//     return JSON.stringify(safeConfig);
//   }
  
//   export default defineAgent({
//     entry: async (ctx: JobContext) => {
//       await ctx.connect();
  
//       const participant = await ctx.waitForParticipant();
  
//       await runMultimodalAgent(ctx, participant);
//     },
//   });
  
//   type TurnDetectionType = {
//     type: "server_vad";
//     threshold?: number;
//     prefix_padding_ms?: number;
//     silence_duration_ms?: number;
//   };
  
//   interface SessionConfig {
//     openaiApiKey: string;
//     instructions: string;
//     voice: string;
//     temperature: number;
//     maxOutputTokens?: number;
//     modalities: string[];
//     turnDetection: TurnDetectionType;
//   }
  
//   function parseSessionConfig(data: any): SessionConfig {
//     return {
//       openaiApiKey: data.openai_api_key || "",
//       instructions: data.instructions || "",
//       voice: data.voice || "",
//       temperature: parseFloat(data.temperature || "0.8"),
//       maxOutputTokens:
//         data.max_output_tokens === "inf"
//           ? Infinity
//           : parseInt(data.max_output_tokens) || undefined,
//       modalities: modalitiesFromString(data.modalities || "text_and_audio"),
//       turnDetection: data.turn_detection ? JSON.parse(data.turn_detection) : null,
//     };
//   }
  
//   function modalitiesFromString(
//     modalities: string,
//   ): ["text", "audio"] | ["text"] {
//     const modalitiesMap: { [key: string]: ["text", "audio"] | ["text"] } = {
//       text_and_audio: ["text", "audio"],
//       text_only: ["text"],
//     };
//     return modalitiesMap[modalities] || ["text", "audio"];
//   }
  
//   function getMicrophoneTrackSid(participant: Participant): string | undefined {
//     return Array.from(participant.trackPublications.values()).find(
//       (track: TrackPublication) => track.source === TrackSource.SOURCE_MICROPHONE,
//     )?.sid;
//   }
  
//   async function runMultimodalAgent(
//     ctx: JobContext,
//     participant: RemoteParticipant,
//   ) {
//     const metadata = JSON.parse(participant.metadata);
//     const config = parseSessionConfig(metadata);
//     console.log(
//       `starting multimodal agent with config: ${safeLogConfig(config)}`,
//     );
  
//     const model = new openai.realtime.RealtimeModel({
//       apiKey: config.openaiApiKey,
//       instructions: config.instructions,
//       voice: config.voice,
//       temperature: config.temperature,
//       maxResponseOutputTokens: config.maxOutputTokens,
//       modalities: config.modalities as ["text", "audio"] | ["text"],
//       turnDetection: config.turnDetection,
//     });
  
//     const agent = new multimodal.MultimodalAgent({ model });
//     const session = (await agent.start(
//       ctx.room,
//     )) as openai.realtime.RealtimeSession;
  
//     session.conversation.item.create({
//       type: "message",
//       role: "user",
//       content: [
//         {
//           type: "input_text",
//           text: "Please begin the interaction with the user in a manner consistent with your instructions.",
//         },
//       ],
//     });
//     session.response.create();
  
//     ctx.room.on(
//       "participantAttributesChanged",
//       (
//         changedAttributes: Record<string, string>,
//         changedParticipant: Participant,
//       ) => {
//         if (changedParticipant !== participant) {
//           return;
//         }
//         const newConfig = parseSessionConfig({
//           ...changedParticipant.attributes,
//           ...changedAttributes,
//         });
  
//         session.sessionUpdate({
//           instructions: newConfig.instructions,
//           temperature: newConfig.temperature,
//           maxResponseOutputTokens: newConfig.maxOutputTokens,
//           modalities: newConfig.modalities as ["text", "audio"] | ["text"],
//           turnDetection: newConfig.turnDetection,
//         });
//       },
//     );
  
//     async function sendTranscription(
//       ctx: JobContext,
//       participant: Participant,
//       trackSid: string,
//       segmentId: string,
//       text: string,
//       isFinal: boolean = true,
//     ) {
//       const transcription = {
//         participantIdentity: participant.identity,
//         trackSid: trackSid,
//         segments: [
//           {
//             id: segmentId,
//             text: text,
//             startTime: BigInt(0),
//             endTime: BigInt(0),
//             language: "",
//             final: isFinal,
//           },
//         ],
//       };
//       const localParticipant = ctx.room.localParticipant;
//       if (localParticipant) {
//         await localParticipant.publishTranscription(transcription);
//       } else {
//         console.error("LocalParticipant is undefined.");
//       }
//     }
  
//     session.on("response_done", (response: openai.realtime.RealtimeResponse) => {
//       let message: string | undefined;
//       if (response.status === "incomplete") {
//         if (response.statusDetails?.type === "incomplete") {
//           const reason = response.statusDetails.reason;
//           switch (reason) {
//             case "max_output_tokens":
//               message = "🚫 Max output tokens reached";
//               break;
//             case "content_filter":
//               message = "🚫 Content filter applied";
//               break;
//             default:
//               message = `🚫 Response incomplete: ${reason}`;
//               break;
//           }
//         } else {
//           message = "🚫 Response incomplete";
//         }
//       } else if (response.status === "failed") {
//         if (response.statusDetails?.type === "failed" && response.statusDetails.error) {
//           switch (response.statusDetails.error.code) {
//             case "server_error":
//               message = `⚠️ Server error`;
//               break;
//             case "rate_limit_exceeded":
//               message = `⚠️ Rate limit exceeded`;
//               break;
//             default:
//               message = `⚠️ Response failed`;
//               break;
//           }
//         } else {
//           message = "⚠️ Response failed";
//         }
//       } else {
//         return;
//       }
  
//       const localParticipant = ctx.room.localParticipant as unknown as LocalParticipant;
//       const trackSid = getMicrophoneTrackSid(localParticipant);
  
//       if (trackSid) {
//         sendTranscription(
//           ctx,
//           localParticipant,
//           trackSid,
//           "status-" + uuidv4(),
//           message,
//         );
//       }
//     });
//   }
  
//   cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
