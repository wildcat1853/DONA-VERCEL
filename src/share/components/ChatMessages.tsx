import React, { memo } from "react";
import { AiChatRow, UserChatRow } from "./ChatRows";
import { Message } from "ai";

type Props = {
  messages: Message[];
  padding: string;
};

function ChatMessages({ messages, padding }: Props) {
  return (
    <div
      style={{ paddingBottom: padding }}
      className="mx-auto w-full h-full overflow-auto flex flex-col-reverse gap-3 pt-20"
    >
      {messages
        .toReversed()
        .filter(
          (el) =>
            el.content != "Hi" &&
            el.content &&
            (el.role == "user" || el.role == "assistant")
        )
        .map((el) => {
          console.log(el.toolInvocations);
          return (
            <React.Fragment key={el.id}>
              {el.role != "user" ? (
                <AiChatRow el={el} />
              ) : (
                <UserChatRow el={el} />
              )}
              {/* {el.toolInvocations ? (
              <div className="bg-gray-200">
                <p>To-do List</p>
                <div className="flex gap-2">
                  {el.toolInvocations.map((el) => (
                    <TaskCard
                      description={el.args.description}
                      name={el.args.title}
                      id={el.args.id}
                      key={el.args.id}
                      status={el.args.status}
                    />
                  ))}
                </div>
              </div>
            ) : null} */}
            </React.Fragment>
          );
        })}
    </div>
  );
}

export default memo(ChatMessages);
