"use client";
import MainLayout from "@/app/components/MainLayout";
import DashboardView from "@/app/components/dashboard/DashboardView";
import NewLooksCard from "@/app/components/appearance/NewLooksCard";

export default function DashboardPage() {
  return (
    <MainLayout>
      <DashboardView notice={<NewLooksCard />} />
    </MainLayout>
  );
}
