import DemoBody from "./DemoBody";
import DemoLayout from "./DemoLayout";
import DemoRuntimeBoundary from "./DemoRuntimeBoundary";

export const metadata = { title: "Demo | Get it done" };

export default function DemoPage() {
  return (
    <DemoRuntimeBoundary>
      <DemoLayout>
        <DemoBody />
      </DemoLayout>
    </DemoRuntimeBoundary>
  );
}
