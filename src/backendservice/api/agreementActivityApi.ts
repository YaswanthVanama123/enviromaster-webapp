import { apiClient } from "../utils/apiClient";

export type ActivityRange = "today" | "week" | "month" | "date";

export interface ActivityAgreement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export interface ActivityEmployee {
  username: string;
  name: string;
  count: number;
}

export interface AgreementActivityResponse {
  success: boolean;
  range: string;
  start: string;
  end: string;
  totalAgreements: number;
  totalEmployees: number;
  employees: ActivityEmployee[];
}

export interface EmployeeAgreementsResponse {
  success: boolean;
  username: string;
  count: number;
  agreements: ActivityAgreement[];
}

export interface ActivityDateRange {
  from?: string;
  to?: string;
}

export const agreementActivityApi = {
  async getActivity(
    range: ActivityRange,
    dates?: ActivityDateRange
  ): Promise<AgreementActivityResponse | null> {
    try {
      const params = new URLSearchParams({ range });
      if (range === "date") {
        if (dates?.from) params.set("from", dates.from);
        if (dates?.to) params.set("to", dates.to);
      }

      const response = await apiClient.get<AgreementActivityResponse>(
        `/api/agreement-activity?${params.toString()}`
      );
      const result = response.data;
      return result?.success ? result : null;
    } catch (error) {
      console.error("Error fetching agreement activity:", error);
      return null;
    }
  },

  async getEmployeeAgreements(
    username: string,
    range: ActivityRange,
    dates?: ActivityDateRange
  ): Promise<ActivityAgreement[] | null> {
    try {
      const params = new URLSearchParams({ username, range });
      if (range === "date") {
        if (dates?.from) params.set("from", dates.from);
        if (dates?.to) params.set("to", dates.to);
      }

      const response = await apiClient.get<EmployeeAgreementsResponse>(
        `/api/agreement-activity/employee?${params.toString()}`
      );
      const result = response.data;
      return result?.success ? result.agreements : null;
    } catch (error) {
      console.error("Error fetching employee agreements:", error);
      return null;
    }
  },
};
