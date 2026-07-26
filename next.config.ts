import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {allowedDevOrigins: ['10.114.155.117'],};

export default withAui(nextConfig);
