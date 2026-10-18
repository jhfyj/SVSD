import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextInput } from "./TextInput";

const meta = {
  title: "Components/TextInput",
  component: TextInput,
  decorators: [(S) => <div className="w-80"><S /></div>],
} satisfies Meta<typeof TextInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Phone: Story = { args: { label: "Phone number", placeholder: "(555) 000-0000", type: "tel" } };
export const Destination: Story = { args: { placeholder: "Search address", "aria-label": "Destination" } };
export const VerificationCode: Story = { args: { label: "Verification code", inputMode: "numeric", maxLength: 6, placeholder: "000000" } };
