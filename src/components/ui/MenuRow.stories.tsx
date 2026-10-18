import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IncidentReporter, Settings } from "@carbon/icons-react";
import { MenuRow } from "./MenuRow";

const meta: Meta = { title: "Components/MenuRow" };
export default meta;

export const ProfileMenu: StoryObj = {
  render: () => (
    <div className="flex w-[305px] flex-col gap-[17px]">
      <MenuRow icon={<Settings size={16} />} label="Settings" />
      <MenuRow icon={<IncidentReporter size={16} />} label="Report" />
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
