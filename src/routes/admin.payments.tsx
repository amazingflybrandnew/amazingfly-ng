import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import { AdminShell } from