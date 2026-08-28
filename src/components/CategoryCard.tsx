import type { Category } from "@/lib/categories";

const CategoryCard = ({ category, onClick }: { category: Category; onClick?: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 min-w-[80px] group"
    >
      <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-border group-hover:ring-primary transition-all">
        <img
          src={category.image}
          alt={category.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <span className="text-xs font-medium text-foreground text-center leading-tight max-w-[80px]">
        {category.name}
      </span>
    </button>
  );
};

export default CategoryCard;
