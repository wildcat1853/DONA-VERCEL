import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Message } from "ai";

type Props = { el: Message };

function AiChatRow({ el }: Props) {
  return (
    <div
      key={el.id}
      style={{
        gridTemplateColumns: "auto 1fr",
        maxWidth: "70%",
      }}
      className={"grid grid-cols-2 gap-3 p-2 justify-start text-base"}
    >
      <Avatar className="rounded-full size-7">
        <AvatarImage src="https://s3-alpha-sig.figma.com/img/5fc7/ec20/ea720662bbdf4919d249c61963e54b80?Expires=1723420800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=d5pY5FyOI5moVLEpSy7PjO5l2H7S0l0VcJhb2qrt2ygJcvnl9s7ebxcgmFBjTrNcwjfV38xwYYBHZhCfAgoN6~6l7z~HIsd4Btn~c2AIu5Yu4Q5pnDxGozgA8yVOIibhBExfy03gRmMisiAzMYFuAHiEKpo5bKDpKuqvDJWR1CALq5AWaLR~-KDTP80pXDEkxxRCDNAXU~bdocwJ9Jm4oKIVxskJhOdQCaPqYdpUEQmfNfzJw59itrAjmUHptw2T00ca-2wDheO2cnmKp0ce0ixqeA0SS6Mo7i8szcp~C~xf1ndrcDrVOVgA978~rMiV8cyP87K9S65Bufd9bDWzkA__" />
        <AvatarFallback>Dn</AvatarFallback>
      </Avatar>
      <div className={" text-black"}>{el.content}</div>
    </div>
  );
}

function UserChatRow({ el }: Props) {
  return (
    <div className="flex justify-end">
      <div
        style={{
          maxWidth: "70%",
        }}
        className="bg-gray-200 rounded-full py-2 px-4 text-base"
      >
        <p>{el.content}</p>
      </div>
    </div>
  );
}

export { AiChatRow, UserChatRow };
