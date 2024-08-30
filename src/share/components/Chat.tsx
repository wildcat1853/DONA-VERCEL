"use client";
import { Button } from "@/share/ui/button";
import { Textarea } from "@/share/ui/textarea";
import { Send } from "lucide-react";
import React, { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem } from "../ui/form";
import { useAssistant } from "ai/react";
import { AiChatRow, UserChatRow } from "./ChatRows";
import { useRouter } from "next/navigation";
import TaskCard from "./TaskCard";

type Props = {
  projectId: string;
  serverMessages: any[];
};

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
    input,
  } = useAssistant({
    api: "/api/chat",
    body: { projectId },
  });

  const router = useRouter();

  useEffect(() => {
    setMessages(serverMessages);
    // console.log(serverMessages.length);
    if (messages.length == 0 && serverMessages.length == 0) {
      append({ role: "user", content: "Hi" });
    }
  }, []);

  const [usedDataId, setUsedDataId] = useState<string[]>([]);

  useEffect(() => {
    const lastMsg = messages.at(-2);
    // console.log(messages);
    if (!lastMsg || lastMsg?.role != "data") return;
    if (usedDataId.some((el) => el == lastMsg.id)) return;
    setUsedDataId((prev) => [...prev, lastMsg.id]);
    //@ts-ignore
    if (lastMsg?.data?.text) router.refresh();
  }, [messages]);

  const [padding, setPadding] = useState("");

  useEffect(() => {
    if (!inputRef.current) throw new Error("Input ref is null");
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    setPadding(60 + +inputRef.current.style.height.replace("px", "") + "px");
    handleInputChange({ target: { value: form.watch("message") } } as any);
  }, [form.watch("message")]);

  const onSubmit = () => {
    if (!inputRef.current) throw new Error("Input ref is null");
    inputRef.current.style.height = "auto";
    submitMessage();
    form.reset();
  };

  const submitWithEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.code === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (status != "in_progress") onSubmit();
    }
    if (e.code === "Enter" && e.shiftKey) {
      e.preventDefault();
      form.setValue("message", form.getValues().message + `\n`);
    }
  };

  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="px-9 bg-gray-100 flex flex-col w-full h-screen max-h-screen">
      <div
        style={{ paddingBottom: padding }}
        className="mx-auto w-full h-full overflow-auto flex flex-col-reverse gap-3 pt-20"
      >
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
                ) : null}
              </React.Fragment>
            );
          })}
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="absolute left-1/2 transform -translate-x-1/2 bottom-6 flex items-center gap-3  bg-white border-[#E7E7E7] border-solid border rounded-2xl w-11/12"
        >
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem className="w-full h-full">
                <FormControl>
                  <Textarea
                    // style={{ height }}
                    onKeyDown={submitWithEnter}
                    rows={1}
                    className="resize-none h-full border-0  focus:ring-0 focus-visible:ring-0"
                    placeholder="Send a message"
                    {...field}
                    ref={inputRef}
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
