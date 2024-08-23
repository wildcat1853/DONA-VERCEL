import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Message } from "ai";

type Props = { el: Message };

function AiChatRow({ el }: Props) {
  return (
    <div
      key={el.id}
      style={{ maxWidth: "70%" }}
      className={"py-5 px-6 justify-start text-base bg-white rounded-full"}
    >
      <p>{el.content}</p>
    </div>
  );
}

function UserChatRow({ el }: Props) {
  return (
    <div className="flex justify-end">
      <div
        style={{ maxWidth: "70%" }}
        className="bg-[#1871FD] rounded-full py-5 px-6 text-white"
      >
        <p>{el.content}</p>
      </div>
    </div>
  );
}

export { AiChatRow, UserChatRow };
