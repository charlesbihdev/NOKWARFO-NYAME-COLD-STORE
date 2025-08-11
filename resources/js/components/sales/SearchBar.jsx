import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const SearchBar = ({ searchTerm, onSearchChange }) => {
    return (
        <div className="mb-4 flex items-center space-x-2">
            <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                    placeholder="Search by Transaction ID, Customer, or Product..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-8"
                />
            </div>
        </div>
    );
};

export default SearchBar;
