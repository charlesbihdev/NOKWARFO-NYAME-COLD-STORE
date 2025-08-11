import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from '@inertiajs/react';

export default function TagCreationForm({ onAddTag }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });

    function handleSubmit(e) {
        e.preventDefault();
        if (!data.name.trim()) return;

        post(route('bank-transfer-tags.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onAddTag();
            },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <Input
                placeholder="New tag name"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <div className="text-sm text-red-500">{errors.name}</div>}
            <Button type="submit" variant="outline" disabled={!data.name.trim() || processing}>
                Add Tag
            </Button>
        </form>
    );
}
