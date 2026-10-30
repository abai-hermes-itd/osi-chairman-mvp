import { useState, useEffect } from 'react';

// Типизация для твоего МКД в Семее
export interface MkdConfig {
  management_type: 'OSI' | 'KSK' | 'PT' | '';
  name: string;
  city: string;
  address: string;
  total_flats: number;
  status: 'PENDING_SETUP' | 'CONFIGURED' | 'ACTIVE';
}

export function useMkd() {
  const [config, setConfig] = useState<MkdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      // Паспорт МКД текущего председателя (из БД; шаблон — data/config/house.md)
      const response = await fetch('/api/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Ошибка загрузки паспорта МКД:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Проверка: настроен ли дом (стерильное состояние или нет)
  const isSetup = !!config?.management_type && config.status !== 'PENDING_SETUP';

  return { config, isSetup, isLoading, refresh: fetchConfig };
}