import { useEffect, useState, type FormEvent } from 'react';
import { PlaneTakeoff } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import { Button, Card, CardBody, CardHeader, Input, Select, Spinner } from '../components';
import { airlinesApi, flightsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Airline } from '../types';

type FlightFormData = {
  naziv: string;
  airline_id: string;
  duzina_km: string;
  trajanje_minuta: string;
  vreme_polaska: string;
  aerodrom_polaska: string;
  aerodrom_dolaska: string;
  cena_karte: string;
  ukupno_mesta: string;
};


const initialForm: FlightFormData = {
  naziv: '',
  airline_id: '',
  duzina_km: '',
  trajanje_minuta: '',
  vreme_polaska: '',
  aerodrom_polaska: '',
  aerodrom_dolaska: '',
  cena_karte: '',
  ukupno_mesta: '100',
};

export function CreateFlightPage() {
  const { addToast } = useToast();
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FlightFormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadAirlines = async () => {
      setIsLoading(true);
      try {
        const response = await airlinesApi.getAll();
        if (response.success) {
          setAirlines(response.data || []);
        }
      } catch {
        addToast({
          type: 'error',
          title: 'Greška',
          message: 'Nije mogućee učitati avio kompanije.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAirlines();
  }, [addToast]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.naziv.trim()) newErrors.naziv = 'Naziv je obavezan';
    if (!formData.airline_id) newErrors.airline_id = 'Avio kompanija je obavezna';
    if (!formData.duzina_km || Number(formData.duzina_km) <= 0) newErrors.duzina_km = 'Unesite validnu dužinu';
    if (!formData.trajanje_minuta || Number(formData.trajanje_minuta) <= 0) newErrors.trajanje_minuta = 'Unesite validno trajanje';
    if (!formData.vreme_polaska) newErrors.vreme_polaska = 'Vreme polaska je obavezno';
    if (!formData.aerodrom_polaska.trim()) newErrors.aerodrom_polaska = 'Aerodrom polaska je obavezan';
    if (!formData.aerodrom_dolaska.trim()) newErrors.aerodrom_dolaska = 'Aerodrom dolaska je obavezan';
    if (!formData.cena_karte || Number(formData.cena_karte) <= 0) newErrors.cena_karte = 'Unesite validnu cenu';
    if (!formData.ukupno_mesta || Number(formData.ukupno_mesta) <= 0) newErrors.ukupno_mesta = 'Unesite validan broj mesta';

    if (formData.aerodrom_polaska && formData.aerodrom_dolaska && formData.aerodrom_polaska === formData.aerodrom_dolaska) {
      newErrors.aerodrom_dolaska = 'Aerodrom polaska i dolaska ne mogu biti isti';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FlightFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        naziv: formData.naziv.trim(),
        airline_id: Number(formData.airline_id),
        duzina_km: Number(formData.duzina_km),
        trajanje_minuta: Number(formData.trajanje_minuta),
        vreme_polaska: formData.vreme_polaska,
        aerodrom_polaska: formData.aerodrom_polaska.trim(),
        aerodrom_dolaska: formData.aerodrom_dolaska.trim(),
        cena_karte: Number(formData.cena_karte),
        ukupno_mesta: Number(formData.ukupno_mesta),
      };

      const response = await flightsApi.create(payload);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Let kreiran',
          message: 'Let je prosleđen na odobrenje administratoru.',
        });
        setFormData(initialForm);
      } else {
        addToast({
          type: 'error',
          title: 'Greška',
          message: response.message || 'Nije moguće kreirati let.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Greška',
        message: 'Došlo je do greške prilikom kreiranja leta.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TopHeader title="Kreiraj let" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h2>Kreiranje novog leta</h2>
              <p className="page-subtitle">
                Unesite sve potrebne informacije kako bi let bio poslat administratoru na odobrenje.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader title="Podaci o letu" />
          <CardBody>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                <Spinner />
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                  <Input
                    label="Naziv leta"
                    required
                    value={formData.naziv}
                    onChange={(e) => handleChange('naziv', e.target.value)}
                    error={errors.naziv}
                    placeholder="JU123 Beograd - Pariz"
                  />
                  <Select
                    label="Avio kompanija"
                    required
                    value={formData.airline_id}
                    onChange={(e) => handleChange('airline_id', e.target.value)}
                    error={errors.airline_id}
                    placeholder="Izaberite kompaniju"
                    options={airlines.map((airline) => ({
                      value: airline.id,
                      label: `${airline.naziv} (${airline.kod})`,
                    }))}
                  />
                  <Input
                    label="Dužina leta (km)"
                    type="number"
                    required
                    value={formData.duzina_km}
                    onChange={(e) => handleChange('duzina_km', e.target.value)}
                    error={errors.duzina_km}
                    min="1"
                  />
                  <Input
                    label="Trajanje leta (min)"
                    type="number"
                    required
                    value={formData.trajanje_minuta}
                    onChange={(e) => handleChange('trajanje_minuta', e.target.value)}
                    error={errors.trajanje_minuta}
                    min="1"
                  />
                  <Input
                    label="Vreme polaska"
                    type="datetime-local"
                    required
                    value={formData.vreme_polaska}
                    onChange={(e) => handleChange('vreme_polaska', e.target.value)}
                    error={errors.vreme_polaska}
                  />
                  <Input
                    label="Cena karte (EUR)"
                    type="number"
                    required
                    value={formData.cena_karte}
                    onChange={(e) => handleChange('cena_karte', e.target.value)}
                    error={errors.cena_karte}
                    min="1"
                    step="0.01"
                  />
                  <Input
                    label="Aerodrom polaska"
                    required
                    value={formData.aerodrom_polaska}
                    onChange={(e) => handleChange('aerodrom_polaska', e.target.value)}
                    error={errors.aerodrom_polaska}
                    placeholder="Aerodrom Nikola Tesla"
                  />
                  <Input
                    label="Aerodrom dolaska"
                    required
                    value={formData.aerodrom_dolaska}
                    onChange={(e) => handleChange('aerodrom_dolaska', e.target.value)}
                    error={errors.aerodrom_dolaska}
                    placeholder="Charles de Gaulle"
                  />
                  <Input
                    label="Ukupno mesta"
                    type="number"
                    required
                    value={formData.ukupno_mesta}
                    onChange={(e) => handleChange('ukupno_mesta', e.target.value)}
                    error={errors.ukupno_mesta}
                    min="1"
                  />
                </div>

                <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <Button type="submit" isLoading={isSubmitting} leftIcon={<PlaneTakeoff size={18} />}>
                    Kreiraj let
                  </Button>
                  <Button variant="secondary" type="button" onClick={() => setFormData(initialForm)}>
                    Poništi
                  </Button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}


