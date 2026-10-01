'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AnalystConsole } from '../../components/AnalystConsole';

export default function AnalystPage() {
  const router = useRouter();
  return (
    <AnalystConsole
      onOpenRing={() => router.push('/rings')}
      onOpenTrace={() => router.push('/recovery')}
    />
  );
}
