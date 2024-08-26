"use client";
import { Button } from "@/share/ui/button";
import { Textarea } from "@/share/ui/textarea";
import { Send } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem } from "../ui/form";
import { useAssistant, useChat } from "ai/react";
import { AiChatRow, UserChatRow } from "./ChatRows";
import { useRouter } from "next/navigation";
import TaskCard from "./TaskCard";

type Props = { projectId: string; serverMessages: any[] };

type MessageType = {
  id: number;
  message: string;
  isMy: boolean;
};

function Chat({ projectId, serverMessages }: Props) {
  const form = useForm({ values: { message: "" } });

  const {
    status,
    messages,
    submitMessage,
    handleInputChange,
    setMessages,
    append,
    threadId,
  } = useAssistant({
    api: "/api/chat",
    body: {
      projectId,
    },
  });

  const router = useRouter();

  const watch = form.watch("message");

  useEffect(() => {
    setMessages(serverMessages);
    console.log(serverMessages.length);
    if (messages.length == 0 && serverMessages.length == 0) {
      append({ role: "user", content: "Hi" });
    }
  }, []);

  useEffect(() => {
    const lastMsg = messages.at(-1);
    //@ts-ignore
    if (lastMsg?.data?.text) router.refresh();
  }, [messages]);

  useEffect(() => {
    handleInputChange({ target: { value: watch } } as any);
  }, [watch]);

  const onSubmit = (data: any) => {
    submitMessage();
    form.reset();
  };
  useEffect(() => {
    if (messages[messages.length - 1]?.toolInvocations) {
      router.refresh();
    }
    console.log(messages);
  }, [messages]);

  return (
    <div className="px-9 bg-gray-100 flex flex-col w-full h-screen max-h-screen">
      <div className="mx-auto w-full grow overflow-auto flex flex-col-reverse gap-3 ">
        {messages
          .toReversed()
          .filter((el) => el.content != "Hi" && el.content)
          .map((el) => {
            console.log(el.toolInvocations);
            return (
              <React.Fragment key={el.id}>
                {el.role != "user" ? (
                  <AiChatRow el={el} />
                ) : (
                  <UserChatRow el={el} />
                )}
                {el.toolInvocations ? (
                  <div className="bg-gray-200">
                    <p>To-do List</p>
                    <div className=" flex  gap-2">
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
                ) : null}
              </React.Fragment>
            );
          })}
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-center gap-4 mx-auto my-10 bg-white border-[#E7E7E7] border-solid border rounded-2xl w-full px-3"
        >
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormControl>
                  <Textarea
                    rows={1}
                    className="resize-none border-0 !max-h-20 focus:ring-0 focus-visible:ring-0"
                    placeholder="Send a message"
                    {...field}
                  />
                </FormControl>
                {/* <FormMessage /> */}
              </FormItem>
            )}
          />
          <Button
            variant={"ghost"}
            className="text-secondary-foreground hover:text-secondary"
            type="submit"
            disabled={status == "in_progress"}
          >
            <Send />
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default Chat;
