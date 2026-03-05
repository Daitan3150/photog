import BlogEditorPage from '../editor';

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
    return <BlogEditorPage params={params} />;
}
