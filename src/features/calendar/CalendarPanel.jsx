import React from "react";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import { Tag } from "../../components/UI";
// TODO(CAL-01): Calendar export first, then availability import. See server/integrations/calendar.js.
export default function CalendarPanel() {
  return (
    <div className="panel integration-card">
      <CalendarDays size={23} />
      <Tag>Not connected</Tag>
      <h3>Get everyone on the same page.</h3>
      <p>Calendar export is up first, with availability import to follow.</p>
      <div className="integration-labels">
        <span>Google</span>
        <span>Apple</span>
        <span>Outlook</span>
      </div>
    </div>
  );
}
