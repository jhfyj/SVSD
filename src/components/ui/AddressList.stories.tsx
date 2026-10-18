import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AddressList } from "./AddressList";

const meta = {
  title: "Components/AddressList",
  component: AddressList,
  decorators: [(S) => <div className="w-80"><S /></div>],
  args: {
    onSelect: fn(),
    items: [
      { id: "1", name: "Golden Gate Park", detail: "San Francisco, CA" },
      { id: "2", name: "Golden Gate Bridge", detail: "US-101, San Francisco, CA" },
      { id: "3", name: "Golden State Warriors", detail: "Chase Center, San Francisco" },
    ],
  },
} satisfies Meta<typeof AddressList>;
export default meta;

export const Results: StoryObj<typeof meta> = {};
