import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StaffMember, Ticket, TicketUpdate } from '@/types';
import {
  CATEGORIES,
  PRIORITIES,
  PRIORITY_META,
  SHORT_CATEGORY_LABELS,
  STATUSES,
  statusLabel,
} from '../utils/ticketMeta';

interface AdminTicketControlsProps {
  ticket: Ticket;
  staff: StaffMember[];
  onChange: (patch: TicketUpdate) => void;
  disabled?: boolean;
}

const UNASSIGNED = '__unassigned';

/** Status, priority, category and assignee pickers for support staff. */
const AdminTicketControls = ({ ticket, staff, onChange, disabled }: AdminTicketControlsProps) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Status</Label>
      <Select value={ticket.status} onValueChange={v => onChange({ status: v as Ticket['status'] })} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map(s => (
            <SelectItem key={s} value={s}>
              {statusLabel(s, true)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Priority</Label>
      <Select
        value={ticket.priority}
        onValueChange={v => onChange({ priority: v as Ticket['priority'] })}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map(p => (
            <SelectItem key={p} value={p}>
              {PRIORITY_META[p].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Category</Label>
      <Select
        value={ticket.category}
        onValueChange={v => onChange({ category: v as Ticket['category'] })}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(c => (
            <SelectItem key={c} value={c}>
              {SHORT_CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Assignee</Label>
      <Select
        value={ticket.assignedTo ?? UNASSIGNED}
        onValueChange={v => onChange({ assignedTo: v === UNASSIGNED ? null : v })}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {staff.map(member => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

export default AdminTicketControls;
