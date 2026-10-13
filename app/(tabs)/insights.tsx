import React from 'react';
import { Screen } from '@/components/Screen';
import { Body, Card, Heading, ScopeSwitch } from '@/components/UI';
export default function Insights() { return <Screen><Heading subtitle="Monthly spending at a glance">Insights</Heading><ScopeSwitch /><Card><Body muted>Spending trends and category breakdowns will appear here once expenses are available.</Body></Card></Screen>; }
