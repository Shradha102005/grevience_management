import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import {
  PhoneCall, Inbox, Clock, AlertCircle, CheckCircle2, User, 
  MessageSquare, Send, Tag, Phone, Search, Archive, Paperclip, MoreHorizontal, Reply, Zap
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/portal/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";

export const Route = createFileRoute("/portal/helpline")({
  component: Helpline,
});

// Mock Tickets
const MOCK_TICKETS = [
  { id: "HLP-90214", subject: "Ration Card Renewal Failed", requester: "Rajesh K.", status: "Open", priority: "High", channel: "Phone", updated: "10m ago", messages: [
    { sender: "Rajesh K.", type: "user", text: "I tried renewing my ration card online but the OTP never arrives.", time: "10:24 AM" }
  ]},
  { id: "HLP-90213", subject: "Birth Certificate Enquiry", requester: "Meena S.", status: "Pending", priority: "Normal", channel: "Web", updated: "1h ago", messages: [
    { sender: "Meena S.", type: "user", text: "What documents are required for a birth certificate?", time: "09:15 AM" },
    { sender: "Agent", type: "agent", text: "Hello Meena, you need the hospital discharge summary and parents' Aadhaar.", time: "09:30 AM" }
  ]},
  { id: "HLP-90210", subject: "Property Tax Portal Down", requester: "Ahmed R.", status: "Open", priority: "Critical", channel: "Email", updated: "2h ago", messages: [
    { sender: "Ahmed R.", type: "user", text: "I cannot pay my property tax, the gateway is crashing.", time: "08:00 AM" }
  ]},
  { id: "HLP-90205", subject: "Streetlight not working", requester: "Priya V.", status: "Closed", priority: "Low", channel: "App", updated: "1d ago", messages: [
    { sender: "Priya V.", type: "user", text: "The streetlight near sector 4 park is broken.", time: "Yesterday" }
  ]}
];

const MACROS = [
  { label: "Request Aadhaar", text: "Could you please provide the last 4 digits of your Aadhaar card for verification?" },
  { label: "Link to Portal", text: "You can complete this process online at our official portal: https://civicos.gov.in/services" },
  { label: "Escalate to L2", text: "I am escalating this ticket to our Level 2 support team. They will contact you shortly." },
  { label: "Close Ticket", text: "As the issue has been resolved, we are closing this ticket. Have a great day!" }
];

function Helpline() {
  const [activeQueue, setActiveQueue] = useState("Open");
  const [tickets, setTickets] = useState(MOCK_TICKETS);
  const [activeTicket, setActiveTicket] = useState(MOCK_TICKETS[0]);
  const [replyText, setReplyText] = useState("");

  const filteredTickets = activeQueue === "All" ? tickets : tickets.filter(t => t.status === activeQueue);

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    const updated = { ...activeTicket, messages: [...activeTicket.messages, { sender: "You", type: "agent", text: replyText, time: "Just now" }] };
    setTickets(tickets.map(t => t.id === updated.id ? updated : t));
    setActiveTicket(updated);
    setReplyText("");
    toast.success("Reply sent to user.");
  };

  const insertMacro = (text: string) => {
    setReplyText(prev => prev + (prev ? "\n" : "") + text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-0 bg-background text-foreground">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-primary"><PhoneCall className="h-4 w-4" /></div>
            <span className="font-semibold text-sm">Helpdesk Console</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-7 pl-8 text-xs w-64 bg-muted/20 border-transparent hover:border-border focus:border-border" placeholder="Search tickets, users..." />
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7"><User className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Pane: Queues */}
        <div className="w-56 shrink-0 bg-muted/10 border-r border-border/50 flex flex-col min-h-0">
          <div className="p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Queues</div>
          <div className="flex-1 px-2 space-y-1">
            {[
              { id: "Open", label: "Open Tickets", icon: Inbox, count: tickets.filter(t => t.status === "Open").length },
              { id: "Pending", label: "Pending", icon: Clock, count: tickets.filter(t => t.status === "Pending").length },
              { id: "Closed", label: "Resolved", icon: CheckCircle2, count: tickets.filter(t => t.status === "Closed").length },
              { id: "All", label: "All Tickets", icon: Archive, count: tickets.length },
            ].map(q => (
              <button 
                key={q.id}
                onClick={() => setActiveQueue(q.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-sm transition-colors ${activeQueue === q.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <div className="flex items-center gap-2"><q.icon className="h-4 w-4" /> {q.label}</div>
                {q.count > 0 && <span className="text-[10px] bg-background border border-border px-1.5 rounded-sm">{q.count}</span>}
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-border/50">
             <div className="flex items-center gap-2 text-xs font-semibold text-success"><div className="h-2 w-2 rounded-full bg-success animate-pulse" /> Agent Status: Online</div>
          </div>
        </div>

        {/* Middle Pane: Ticket List */}
        <div className="w-80 shrink-0 bg-background border-r border-border/50 flex flex-col min-h-0">
          <div className="p-3 border-b border-border/50 bg-card sticky top-0 font-semibold text-sm flex justify-between items-center">
            {activeQueue} Queue <Badge variant="secondary" className="text-[10px]">{filteredTickets.length}</Badge>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredTickets.map(t => (
              <div 
                key={t.id} 
                onClick={() => setActiveTicket(t)}
                className={`p-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/30 ${activeTicket.id === t.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">{t.id}</span>
                  <span className="text-[10px] text-muted-foreground">{t.updated}</span>
                </div>
                <h4 className="text-sm font-bold truncate mb-1">{t.subject}</h4>
                <p className="text-xs text-muted-foreground truncate mb-2">{t.requester}</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className={`text-[9px] h-4 rounded-sm ${t.priority === 'Critical' ? 'text-destructive border-destructive/30' : 'text-muted-foreground'}`}>{t.priority}</Badge>
                  <Badge variant="outline" className="text-[9px] h-4 rounded-sm border-border text-muted-foreground">{t.channel}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Ticket Detail */}
        <div className="flex-1 bg-card flex flex-col min-h-0">
          {activeTicket ? (
            <>
              {/* Ticket Header */}
              <div className="p-4 border-b border-border/50 bg-background flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-xl font-bold mb-1">{activeTicket.subject}</h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{activeTicket.id}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {activeTicket.requester}</span>
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {activeTicket.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs border-border">Assign to me</Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 border-border"><MoreHorizontal className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Thread */}
              <div className="flex-1 overflow-auto p-6 space-y-6 bg-muted/5">
                {activeTicket.messages.map((m, i) => (
                  <div key={i} className={`flex flex-col max-w-[85%] ${m.type === 'agent' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] font-bold text-muted-foreground">{m.sender}</span>
                      <span className="text-[10px] text-muted-foreground">{m.time}</span>
                    </div>
                    <div className={`p-3 rounded-lg text-sm shadow-sm ${m.type === 'agent' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-background border border-border rounded-tl-none'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-border/50 bg-background shrink-0">
                 <div className="flex gap-2 mb-2">
                   {MACROS.map((m, i) => (
                     <Badge key={i} variant="outline" className="text-[10px] cursor-pointer hover:bg-muted/50 border-primary/20 text-primary bg-primary/5 transition-colors" onClick={() => insertMacro(m.text)}>
                       <Zap className="h-3 w-3 mr-1" /> {m.label}
                     </Badge>
                   ))}
                 </div>
                 <div className="border border-border focus-within:border-primary transition-colors rounded-md bg-card overflow-hidden flex flex-col">
                   <Textarea 
                     className="border-0 focus-visible:ring-0 resize-none min-h-[100px] text-sm p-3" 
                     placeholder="Type your reply here..." 
                     value={replyText}
                     onChange={e => setReplyText(e.target.value)}
                   />
                   <div className="bg-muted/20 border-t border-border/50 p-2 flex justify-between items-center">
                     <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Paperclip className="h-4 w-4" /></Button>
                     </div>
                     <div className="flex gap-2">
                       <Select defaultValue="Pending">
                         <SelectTrigger className="h-8 text-xs w-[130px] border-border bg-background"><SelectValue /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="Open" className="text-xs">Submit as Open</SelectItem>
                           <SelectItem value="Pending" className="text-xs">Submit as Pending</SelectItem>
                           <SelectItem value="Closed" className="text-xs">Submit as Closed</SelectItem>
                         </SelectContent>
                       </Select>
                       <Button size="sm" className="h-8 text-xs" onClick={handleSendReply}><Reply className="mr-2 h-3.5 w-3.5" /> Send Reply</Button>
                     </div>
                   </div>
                 </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
               <Inbox className="h-12 w-12 mb-4 opacity-20" />
               <p className="font-semibold text-sm">No ticket selected</p>
               <p className="text-xs">Select a ticket from the queue to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
