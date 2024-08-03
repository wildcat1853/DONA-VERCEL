import Chat from "@/share/components/Chat";
import { Avatar, AvatarImage } from "@/share/ui/avatar";
import { Separator } from "@/share/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/share/ui/tabs";
import { AvatarFallback } from "@radix-ui/react-avatar";
import React from "react";

type Props = {
  params: { chatId: string };
  searchParams: {};
};

function page({ params }: Props) {
  return (
    <div className="flex">
      <div className="w-1/3 bg-black relative ">
        <div className="w-full h-1/5 bg-gray-800 absolute top-0" />
        <div>
          <Avatar className="rounded-full">
            <AvatarImage src="https://s3-alpha-sig.figma.com/img/4fe0/1d8f/13661e3a07d998d6cb8a763a2fb3cf06?Expires=1723420800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=RhgxBVgDu-N7jhubUBA9gQDpCc8Lj-N1fRLwOKKBF9DBHlDGk-YoadhrSe64VVrJ4IQwdm0oYcD2W~0WtRocuyuQI8JTvrZyeyvTdt9T~wlSJjJ73RAenkCNw0wqIPpyBhUJitLDd9RnFeZuIB4Daa7ubEj8ExCGZvBSxskHgvkgCskbXHcCLNTI57kzu5xRbPwxPinDWFFftXdSJ1F~sCSQVIYUxliOjl8gwg4snVg8lRKTlRlz-C2ZMvIi2cGYTNiHGgRcDATN24NMMH0JKLQ-UBMy7c3W71yqRvPe3LxBSmIZ8U7klrjqEU6xyr~Qhne6BQE2kfEqql2UrRwm5A__" />
            <AvatarFallback>Dn</AvatarFallback>
          </Avatar>
          <p className="text-white">Donna</p>
        </div>
        <Separator className="my-4 bg-white" />
        <Tabs defaultValue="account" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
          <TabsContent value="pending"></TabsContent>
          <TabsContent value="done"></TabsContent>
        </Tabs>
      </div>
      <div className="flex flex-col w-screen h-screen max-h-screen">
        <Chat />
      </div>
    </div>
  );
}

export default page;
