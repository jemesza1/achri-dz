import {
  Smartphone, Car, Building2, Shirt, Sofa, Wrench, Refrigerator, Dumbbell, Package,
  type LucideIcon,
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  "Téléphones & Tech": Smartphone,
  "Véhicules": Car,
  "Immobilier": Building2,
  "Mode": Shirt,
  "Maison & Jardin": Sofa,
  "Outils & Bricolage": Wrench,
  "Électroménager": Refrigerator,
  "Loisirs & Sports": Dumbbell,
  "Autres": Package,
};

export function getCategoryIcon(category: string): LucideIcon {
  return categoryIcons[category] || Package;
}
