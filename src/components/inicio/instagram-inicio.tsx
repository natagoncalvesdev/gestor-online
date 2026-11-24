export function InstagramInicio({
  posts,
}: {
  posts: { id: string; src: string; link: string }[];
}) {
  if (posts.length === 0) return null;

  return (
    <section className="bg-[#f7f4ef] px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold uppercase tracking-wide text-accent sm:text-3xl">
          Siga o CETADEB no Instagram
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => {
            const foto = <img src={post.src} alt="" className="aspect-square w-full object-cover" />;
            return post.link ? (
              <a key={post.id} href={post.link} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg">
                {foto}
              </a>
            ) : (
              <div key={post.id} className="overflow-hidden rounded-lg">
                {foto}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
