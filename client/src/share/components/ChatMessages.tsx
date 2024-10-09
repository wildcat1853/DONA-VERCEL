import React, { memo } from "react";
import { AiChatRow, UserChatRow } from "./ChatRows";
import { Message } from "ai";
import WritingBubble from "./WritingBubble";

type Props = {
  messages: Message[];
  padding: string;
  isAiResponding: boolean; // Add this prop
};

function ChatMessages({ messages, padding, isAiResponding }: Props) {
  return (
    <div
      style={{ paddingBottom: padding }}
      className="mx-auto w-full h-full overflow-auto flex flex-col-reverse gap-3 pt-20"
    >
      {isAiResponding && <WritingBubble />} {/* Add this line */}
      {messages
        .toReversed()
        .filter(
          (el) =>
            el.content != "Hi" &&
            el.content &&
            (el.role == "user" || el.role == "assistant")
        )
        .map((el) => {
          return (
            <React.Fragment key={el.id}>
              {el.role != "user" ? (
                <AiChatRow el={el} />
              ) : (
                <UserChatRow el={el} />
              )}
            </React.Fragment>
          );
        })}
    </div>
  );
}

export default memo(ChatMessages);
