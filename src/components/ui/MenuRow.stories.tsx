import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FlagIcon, SettingsIcon } from "./icons";
import { MenuRow } from "./MenuRow";

const meta: Meta = { title: "Components/MenuRow" };
export default meta;

export const ProfileMenu: StoryObj = {
  render: () => (
    <div className="flex w-80 flex-col divide-y divide-border">
      <MenuRow icon={<SettingsIcon />} label="Settings" />
      <MenuRow icon={<FlagIcon />} label="Report" />
      <MenuRow label="Delete account" tone="danger" />
    </div>
  ),
};
