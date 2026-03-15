"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchBillingState } from "@/features/billing/api";

const BILLING_QUERY_KEY = ["billing", "state"] as const;

export function useBillingState() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasBillingSuccess = searchParams.get("billing") === "success";

  useEffect(() => {
    if (!hasBillingSuccess) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("billing");

    const nextQuery = nextSearchParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [hasBillingSuccess, pathname, queryClient, router, searchParams]);

  return useQuery({
    queryKey: BILLING_QUERY_KEY,
    queryFn: fetchBillingState,
  });
}
