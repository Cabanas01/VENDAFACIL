'use client';

import { useState, useEffect } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// --- Sales by Product Chart ---
export function SalesByProductChart({ data }: { data: { name: string; total: number }[] }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return <div className="h-64 bg-muted animate-pulse rounded-lg" />;
  if (!data || data.length === 0) return <NoDataCard title="Faturamento por Produto" />;
  
  const chartData = data.slice(0, 8).map(item => ({...item, fill: 'var(--color-total)'}));

  const chartConfig = {
    total: {
      label: "Faturamento",
      color: "hsl(var(--chart-1))",
    },
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento por Produto (Top 8)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64">
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" dataKey="total" tickFormatter={(value) => formatCurrency(value)} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} hideLabel />}
            />
            <Bar dataKey="total" name="Faturamento" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// --- Sales by Payment Method Chart ---
export function SalesByPaymentMethodChart({ data }: { data: { name: 'cash' | 'pix' | 'card', value: number }[] }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return <div className="h-64 bg-muted animate-pulse rounded-lg" />;
  if (!data || data.length === 0) return <NoDataCard title="Faturamento por Forma de Pagamento" />;

  const paymentMethodLabels = {
    cash: 'Dinheiro',
    pix: 'Pix',
    card: 'Cartão'
  };

  const chartData = data.map(item => ({ ...item, name: paymentMethodLabels[item.name as keyof typeof paymentMethodLabels] || item.name }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento por Forma de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={256}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                return (
                  <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
              outerRadius={100}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Stock by Category Chart ---
export function StockByCategoryChart({ data }: { data: { name: string; total: number }[] }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return <div className="h-64 bg-muted animate-pulse rounded-lg" />;
  if (!data || data.length === 0) return <NoDataCard title="Estoque por Categoria" />;

  const chartConfig = {
    total: {
      label: "Estoque",
      color: "hsl(var(--chart-2))",
    },
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estoque por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="total" name="Quantidade" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// --- Sales by Category Chart ---
export function SalesByCategoryChart({ data }: { data: { name: string; total: number }[] }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return <div className="h-64 bg-muted animate-pulse rounded-lg" />;
  if (!data || data.length === 0) return <NoDataCard title="Categorias mais Vendidas" />;

  const chartConfig = {
      total: {
      label: "Quantidade",
      color: "hsl(var(--chart-3))",
      },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias mais Vendidas (Quantidade)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64">
           <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="total" name="Quantidade" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// --- Sales over Time Chart ---
export function SalesOverTimeChart({ data }: { data: { date: string; total: number }[] }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return <div className="h-64 bg-muted animate-pulse rounded-lg" />;
  if (!data || data.length === 0) return <NoDataCard title="Faturamento por Dia" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento por Dia</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Line type="monotone" dataKey="total" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// No Data Placeholder
function NoDataCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground">Sem dados no período</p>
      </CardContent>
    </Card>
  );
}
