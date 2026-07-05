'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatCard } from '@/components/dashboard/stat-card';
import { Workflow, Bot, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [name, setName] = useState('Jordan Reyes');
  const [bio, setBio] = useState('Building agent-native infrastructure at CROO Labs.');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your public profile and personal information.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Workflows created" value="18" icon={Workflow} index={0} />
        <StatCard label="Agents hired" value="24" icon={Bot} index={1} />
        <StatCard label="Avg. rating given" value="4.7" icon={Star} index={2} />
      </div>

      <Card>
        <CardHeader><CardTitle>Personal information</CardTitle><CardDescription>This information may be visible to your team.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=jordan-reyes" alt={name} />
              <AvatarFallback>JR</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm"><Camera className="h-4 w-4" /> Change photo</Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value="demo@croohub.ai" disabled />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          <Button variant="gradient" onClick={() => toast.success('Profile updated')}>Save changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
