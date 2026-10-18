import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Flag, GearSix } from "@phosphor-icons/react";
import { MenuRow } from "./MenuRow";

const meta: Meta = { title: "Components/MenuRow" };
export default meta;

export const ProfileMenu: StoryObj = {
  render: () => (
    <div className="flex w-[305px] flex-col gap-[17px]">
      <MenuRow icon={<GearSix size={16} aria-hidden />} label="Settings" />
      <MenuRow icon={<Flag size={16} aria-hidden />} label="Report" />
    </div>
  ),
};

export const Danger: StoryObj = {
  render: () => (
    <div className="w-[305px]">
      <MenuRow label="Delete account" tone="danger" />
    </div>
  ),
};
