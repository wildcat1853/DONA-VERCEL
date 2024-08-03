"use client";
import { Cookie } from "next/font/google";
import React from "react";
import { v4 as uuid } from "uuid";
type Props = {};

function UserIdMiddleWare({}: Props) {
  // const userId  = ;
  // const newId = uuid();
  //   Cookie.set("userId", "some-id");
  console.log(document.cookie.split(";"));
  //   document.cookie = "userId=some-id";

  return <></>;
}

export default UserIdMiddleWare;
