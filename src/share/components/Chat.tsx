"use client";
import { Button } from "@/share/ui/button";
import { Textarea } from "@/share/ui/textarea";
import { Send } from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem } from "../ui/form";
import { useChat } from "ai/react";

type Props = {};

type MessageType = {
  id: number;
  message: string;
  isMy: boolean;
};

function Chat({}: Props) {
  const form = useForm({ values: { message: "" } });
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({ keepLastMessageOnError: true });

  const watch = form.watch("message");

  useEffect(() => {
    console.log(watch);
    handleInputChange({ target: { value: watch } });
  }, [watch]);

  const onSubmit = (data: any) => {
    console.log(data);

    handleSubmit();
    form.reset();
  };

  return (
    <>
      <div className="mt-auto mb-0 grow">
        {messages.map((el, i) => (
          <div
            key={el.id}
            className={
              "flex items-center gap-2 p-2 " +
              (el.role == "user" ? "justify-end" : "justify-start")
            }
          >
            <div className={"text-sm text-black"}>{el.content}</div>
          </div>
        ))}
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-center gap-4 mx-auto mb-10 border-[#E7E7E7] border-solid border rounded-2xl w-2/4 px-3"
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
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                {/* <FormMessage /> */}
              </FormItem>
            )}
          />
          <Button variant={"ghost"} type="submit">
            <Send />
          </Button>
        </form>
      </Form>
    </>
  );
}

export default Chat;
