import React from "react";

interface EmailTemplateProps {
  userName: string;
  taskName: string;
  dueDate: string;
  taskUrl: string;
}

export default function UnfinishedTaskEmail({
  userName,
  taskName,
  dueDate,
  taskUrl,
}: EmailTemplateProps) {
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.6,
        color: "#333",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <table
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        style={{ backgroundColor: "#f8f8f8", borderRadius: "5px" }}
      >
        <tr>
          <td style={{ padding: "20px" }}>
            <h1 style={{ color: "#4a4a4a", marginBottom: "20px" }}>
              Task Reminder
            </h1>
            <p>Dear {userName},</p>
            <p>
              Remember, you’ve got that unfinished task waiting for you. Time to
              step up and get it done!
            </p>
            <table
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "5px",
                margin: "20px 0",
              }}
            >
              <tr>
                <td style={{ padding: "15px" }}>
                  <h2 style={{ color: "#4a4a4a", margin: "0 0 10px 0" }}>
                    Task Details
                  </h2>
                  <p>
                    <strong>Task Name:</strong> {taskName}
                  </p>
                  <p>
                    <strong>Due Date:</strong> {dueDate}
                  </p>
                </td>
              </tr>
            </table>
            <p>
              To view and complete your task, please click the button below:
            </p>
            <table cellPadding="0" cellSpacing="0" style={{ margin: "20px 0" }}>
              <tr>
                <td
                  style={{
                    backgroundColor: "#0D71FD",
                    borderRadius: "5px",
                  }}
                >
                  <a
                    href={taskUrl}
                    style={{
                      display: "inline-block",
                      padding: "10px 20px",
                      color: "#ffffff",
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                  >
                    View Tasks
                  </a>
                </td>
              </tr>
            </table>
            <p>
              Best regards,
              <br />
              your Dona
            </p>
          </td>
        </tr>
      </table>
    </div>
  );
}
