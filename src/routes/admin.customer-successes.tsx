import { createFileRoute } from "@tanstack/react-router";
import { CustomerSuccessManager } from "@/components/admin/CustomerSuccessManager";

export const Route = createFileRoute("/admin/customer-successes")({
  component: CustomerSuccessAdminPage,
});

function CustomerSuccessAdminPage() {
  return (
    <main className="container-page section-y bg-[#f7fbff]">
      <CustomerSuccessManager />
    </main>
  );
}
