"use client";
import { nanoid } from "nanoid";
import React from "react";
type Props = {};

function setUserId() {
  const userId = nanoid(8);
  document.cookie = "userId=" + userId;
}
export function getUserId() {
  const userIdStr = document.cookie
    .split(";")
    .find((el) => el.includes("userId"));
  if (!userIdStr) return setUserId();
  const userId = userIdStr.split("=")[1];
  return userId;
}

function UserIdMiddleWare({}: Props) {
  getUserId();

  return <></>;
}

export default UserIdMiddleWare;
