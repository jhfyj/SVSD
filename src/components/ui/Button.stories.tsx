import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Start journey", onClick: fn() },
  argTypes: { variant: { control: "inline-radio", options: ["primary", "secondary", "danger"] } },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const SignIn: Story = { args: { children: "Sign in", fullWidth: true }, decorators: [(S) => <div className="w-80"><S /></div>] };
export const Secondary: Story = { args: { variant: "secondary", children: "Sign up" } };
export const Danger: Story = { args: { variant: "danger", children: "Delete account" } };
export const Disabled: Story = { args: { disabled: true } };
