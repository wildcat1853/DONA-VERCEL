import React from "react";
import { Message } from "ai";
import isValidJSON from "@/helpers/isValidJSON";
import Markdown from "markdown-to-jsx";

type Props = { el: Message };

function AiChatRow({ el }: Props) {
  return (
    <div
      key={el.id}
      style={{ maxWidth: "70%" }}
      className={"py-5 px-6 justify-start text-base bg-white rounded-3xl"}
    >
      <Markdown>{el.content}</Markdown>
    </div>
  );
}

function UserChatRow({ el }: Props) {
  return (
    <div className="flex justify-end">
      <div
        style={{ maxWidth: "70%" }}
        className="bg-[#1871FD] rounded-3xl py-5 px-6 text-white"
      >
        <p>
          {isValidJSON(el.content)
            ? JSON.parse(el.content).message
            : el.content}
        </p>
      </div>
    </div>
  );
}

export { AiChatRow, UserChatRow };
