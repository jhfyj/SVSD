import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./Button";
import { MessageCard } from "./MessageCard";

const meta = {
  title: "Components/MessageCard",
  component: MessageCard,
  decorators: [(S) => <div className="w-80"><S /></div>],
} satisfies Meta<typeof MessageCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Message: Story = {
  args: { kind: "message", from: "Traveller 0412", time: "2 min ago", children: "Traffic is clear past the bridge." },
};
export const Question: Story = {
  args: {
    kind: "question",
    from: "Traveller 0412",
    children: "Any good coffee near exit 23?",
    actions: (
      <>
        <Button className="flex-1">Respond</Button>
        <Button variant="secondary" dot={false}>Skip</Button>
      </>
    ),
  },
};
