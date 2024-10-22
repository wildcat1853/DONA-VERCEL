"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
var agents_1 = require("@livekit/agents");
var openai = require("@livekit/agents-plugin-openai");
var rtc_node_1 = require("@livekit/rtc-node");
var node_url_1 = require("node:url");
var uuid_1 = require("uuid");
function safeLogConfig(config) {
    var safeConfig = __assign(__assign({}, config), { openaiApiKey: "[REDACTED]" });
    return JSON.stringify(safeConfig);
}
exports.default = (0, agents_1.defineAgent)({
    entry: function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var participant;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ctx.connect()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, ctx.waitForParticipant()];
                case 2:
                    participant = _a.sent();
                    return [4 /*yield*/, runMultimodalAgent(ctx, participant)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
});
function parseSessionConfig(data) {
    return {
        openaiApiKey: data.openai_api_key || "",
        instructions: data.instructions || "",
        voice: data.voice || "",
        temperature: parseFloat(data.temperature || "0.8"),
        maxOutputTokens: data.max_output_tokens === "inf"
            ? Infinity
            : parseInt(data.max_output_tokens) || undefined,
        modalities: modalitiesFromString(data.modalities || "text_and_audio"),
        turnDetection: data.turn_detection ? JSON.parse(data.turn_detection) : null,
    };
}
function modalitiesFromString(modalities) {
    var modalitiesMap = {
        text_and_audio: ["text", "audio"],
        text_only: ["text"],
    };
    return modalitiesMap[modalities] || ["text", "audio"];
}
function getMicrophoneTrackSid(participant) {
    var _a;
    return (_a = Array.from(participant.trackPublications.values()).find(function (track) { return track.source === rtc_node_1.TrackSource.SOURCE_MICROPHONE; })) === null || _a === void 0 ? void 0 : _a.sid;
}
function runMultimodalAgent(ctx, participant) {
    return __awaiter(this, void 0, void 0, function () {
        function sendTranscription(ctx_1, participant_1, trackSid_1, segmentId_1, text_1) {
            return __awaiter(this, arguments, void 0, function (ctx, participant, trackSid, segmentId, text, isFinal) {
                var transcription;
                if (isFinal === void 0) { isFinal = true; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            transcription = {
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
                            return [4 /*yield*/, ctx.room.localParticipant.publishTranscription(transcription)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        var metadata, config, model, agent, session;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    metadata = JSON.parse(participant.metadata);
                    config = parseSessionConfig(metadata);
                    console.log("starting multimodal agent with config: ".concat(safeLogConfig(config)));
                    model = new openai.realtime.RealtimeModel({
                        apiKey: config.openaiApiKey,
                        instructions: config.instructions,
                        voice: config.voice,
                        temperature: config.temperature,
                        maxResponseOutputTokens: config.maxOutputTokens,
                        modalities: config.modalities,
                        turnDetection: config.turnDetection,
                    });
                    agent = new agents_1.multimodal.MultimodalAgent({ model: model });
                    return [4 /*yield*/, agent.start(ctx.room)];
                case 1:
                    session = (_a.sent());
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
                    ctx.room.on("participantAttributesChanged", function (changedAttributes, changedParticipant) {
                        if (changedParticipant !== participant) {
                            return;
                        }
                        var newConfig = parseSessionConfig(__assign(__assign({}, changedParticipant.attributes), changedAttributes));
                        session.sessionUpdate({
                            instructions: newConfig.instructions,
                            temperature: newConfig.temperature,
                            maxResponseOutputTokens: newConfig.maxOutputTokens,
                            modalities: newConfig.modalities,
                            turnDetection: newConfig.turnDetection,
                        });
                    });
                    session.on("response_done", function (response) {
                        var _a, _b;
                        var message;
                        if (response.status === "incomplete") {
                            if (((_a = response.statusDetails) === null || _a === void 0 ? void 0 : _a.type) === "incomplete") {
                                var reason = response.statusDetails.reason;
                                switch (reason) {
                                    case "max_output_tokens":
                                        message = "🚫 Max output tokens reached";
                                        break;
                                    case "content_filter":
                                        message = "🚫 Content filter applied";
                                        break;
                                    default:
                                        message = "\uD83D\uDEAB Response incomplete: ".concat(reason);
                                        break;
                                }
                            }
                            else {
                                message = "🚫 Response incomplete";
                            }
                        }
                        else if (response.status === "failed") {
                            if (((_b = response.statusDetails) === null || _b === void 0 ? void 0 : _b.type) === "failed" && response.statusDetails.error) {
                                switch (response.statusDetails.error.code) {
                                    case "server_error":
                                        message = "\u26A0\uFE0F Server error";
                                        break;
                                    case "rate_limit_exceeded":
                                        message = "\u26A0\uFE0F Rate limit exceeded";
                                        break;
                                    default:
                                        message = "\u26A0\uFE0F Response failed";
                                        break;
                                }
                            }
                            else {
                                message = "⚠️ Response failed";
                            }
                        }
                        else {
                            return;
                        }
                        var localParticipant = ctx.room.localParticipant;
                        var trackSid = getMicrophoneTrackSid(localParticipant);
                        if (trackSid) {
                            sendTranscription(ctx, localParticipant, trackSid, "status-" + (0, uuid_1.v4)(), message);
                        }
                    });
                    return [2 /*return*/];
            }
        });
    });
}
agents_1.cli.runApp(new agents_1.WorkerOptions({ agent: (0, node_url_1.fileURLToPath)(import.meta.url) }));
