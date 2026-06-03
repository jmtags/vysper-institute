import { Button } from '../components/Button';
import { ShoppingCart } from 'lucide-react';

interface ProductsPageProps {
  title: string;
  type: 'digital' | 'physical';
  onNavigate: (page: string) => void;
}

export function ProductsPage({ title, type, onNavigate }: ProductsPageProps) {
  const digitalProducts = [
    { id: 1, title: 'Mental Health Assessment Toolkit', price: 1500, image: '📋' },
    { id: 2, title: 'Leadership Development Workbook', price: 800, image: '📖' },
    { id: 3, title: 'Stress Management Guide (eBook)', price: 600, image: '📱' },
    { id: 4, title: 'Team Building Activity Templates', price: 1200, image: '📊' },
    { id: 5, title: 'Workplace Wellness Planner', price: 900, image: '📅' },
    { id: 6, title: 'Communication Skills Toolkit', price: 1000, image: '💬' }
  ];

  const physicalProducts = [
    { id: 1, title: 'Professional Training Kit', price: 3500, image: '📦' },
    { id: 2, title: 'Psychological Assessment Tools Set', price: 5000, image: '🧪' },
    { id: 3, title: 'Mindfulness Practice Cards', price: 800, image: '🃏' },
    { id: 4, title: 'Self-Care Journal (Premium)', price: 650, image: '📔' },
    { id: 5, title: 'Team Workshop Materials Kit', price: 2500, image: '🎨' },
    { id: 6, title: 'Wellness Resource Library Set', price: 4200, image: '📚' }
  ];

  const products = type === 'digital' ? digitalProducts : physicalProducts;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="mb-4 text-primary">{title}</h1>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            {type === 'digital'
              ? 'Digital resources and tools to support your professional development'
              : 'Quality materials and kits for effective training and assessment'
            }
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 h-48 flex items-center justify-center text-7xl">
                {product.image}
              </div>
              <div className="p-6">
                <h3 className="mb-4 text-primary">{product.title}</h3>
                <div className="flex items-center justify-between">
                  <p className="text-2xl text-primary" style={{ fontWeight: 700 }}>
                    ₱{product.price.toLocaleString()}
                  </p>
                  <Button variant="primary">
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
