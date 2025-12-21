import { Construction } from 'lucide-react';
import { TopHeader } from '../components/layout/TopHeader';
import { Button } from '../components';
import { useNavigate } from 'react-router-dom';

interface UnderConstructionPageProps {
  title: string;
  description?: string;
}

export function UnderConstructionPage({ 
  title, 
  description = 'Ova stranica je trenutno u izradi. Molimo vas da se vratite kasnije.'
}: UnderConstructionPageProps) {
  const navigate = useNavigate();
  
  return (
    <>
      <TopHeader title={title} />
      <div className="page-content">
        <div className="under-construction">
          <Construction className="under-construction-icon" />
          <h2>Stranica u izradi</h2>
          <p>{description}</p>
          <Button 
            variant="secondary" 
            onClick={() => navigate(-1)}
            style={{ marginTop: 'var(--spacing-lg)' }}
          >
            Nazad
          </Button>
        </div>
      </div>
    </>
  );
}
