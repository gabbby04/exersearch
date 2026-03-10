import styled from "@emotion/styled";
import React, { useEffect, useState } from "react";
import { api } from "../../../../utils/apiClient";
import { Typography } from "./Typography";

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  rtl: boolean;
}

type AdminSettings = {
  app_name?: string | null;
  logo_url?: string | null;
};

const THEME = "#d23f0b";

function toAbsUrl(u?: string | null) {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;

  const rawBase = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
  const originBase = rawBase.replace(/\/api\/v1$/i, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${originBase}${path}`;
}

const StyledSidebarHeader = styled.div`
  height: 64px;
  min-height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;

  > div {
    width: 100%;
    overflow: hidden;
  }
`;

const LogoWrap = styled.div<{ rtl?: boolean }>`
  width: 42px;
  min-width: 42px;
  height: 42px;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;

  ${({ rtl }) =>
    rtl
      ? `
      margin-left: 10px;
      margin-right: 4px;
    `
      : `
      margin-right: 10px;
      margin-left: 4px;
    `}
`;

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ rtl, ...rest }) => {
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [appName, setAppName] = useState<string>("ExerSearch");

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const res = await api.get("/admin/settings");
        const data: AdminSettings = res.data?.data ?? res.data;

        if (!mounted) return;

        if (data?.logo_url) setLogoUrl(toAbsUrl(data.logo_url));
        if (data?.app_name) setAppName(String(data.app_name));
      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message;

        console.error("Failed to load branding (SidebarHeader)", {
          status,
          msg,
        });
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <StyledSidebarHeader {...rest}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <LogoWrap rtl={rtl}>
          <img
            src={logoUrl || "/SHADOW.png"}
            alt={`${appName} logo`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/SHADOW.png";
            }}
          />
        </LogoWrap>

        <Typography
          variant="subtitle1"
          fontWeight={800}
          style={{
            color: THEME,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {appName}
        </Typography>
      </div>
    </StyledSidebarHeader>
  );
};