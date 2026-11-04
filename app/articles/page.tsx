import ArticlesFeed from "@/components/ArticlesFeed";

export default function ArticlesPage({ searchParams }: { searchParams: { tag?: string } }) {
  const tag = searchParams.tag ? searchParams.tag.toLowerCase().slice(0, 30) : null;
  return <ArticlesFeed key={tag ?? ""} initialTag={tag} />;
}
