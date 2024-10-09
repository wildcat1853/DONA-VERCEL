"use client";
import { Button } from "@/share/ui/button";
import { Textarea } from "@/share/ui/textarea";
import { Send } from "lucide-react";
import React, { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem } from "../ui/form";
import ChatMessages from "./ChatMessages";

type Props = {
  assistantData: any;
};

type MessageType = {
  id: number;
  message: string;
  isMy: boolean;
};

function Chat({ assistantData }: Props) {
  const form = useForm({ values: { message: "" } });
  const { status, messages, append } = assistantData;
  const [padding, setPadding] = useState("");
  const isAiResponding = status === "in_progress"; // Add this line

  useEffect(() => {
    if (!inputRef.current) throw new Error("Input ref is null");
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    setPadding(60 + +inputRef.current.style.height.replace("px", "") + "px");
  }, [form.watch("message")]);

  const onSubmit = () => {
    if (!inputRef.current) throw new Error("Input ref is null");
    inputRef.current.style.height = "auto";
    append({
      role: "user",
      content: form.watch("message"),
      data: { data: "lksjdf" },
    });
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
      <ChatMessages 
        messages={messages} 
        padding={padding} 
        isAiResponding={isAiResponding} // Add this prop
      />
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
            disabled={status != "awaiting_message"}
          >
            <Send />
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default Chat;
