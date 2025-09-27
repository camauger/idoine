import logging
import frontmatter

def parse_frontmatter(content: str):
    """
    Analyse le front matter d'un fichier Markdown en utilisant python-frontmatter.
    Renvoie un tuple (metadata, markdown_content).
    """
    try:
        post = frontmatter.loads(content)
        metadata = post.metadata
        markdown_content = post.content

        # Ensure specific keys are lists
        for key in ['categories', 'meta_keywords', 'tags']:
            if key in metadata and not isinstance(metadata[key], list):
                # If it's a string, split it by commas
                if isinstance(metadata[key], str):
                    metadata[key] = [item.strip() for item in metadata[key].split(',') if item.strip()]
                else:
                    # For other types, wrap in a list if not already a list
                    metadata[key] = [metadata[key]]
        
        return metadata, markdown_content
    except Exception as e:
        logging.error(f"Erreur lors du parsing du frontmatter: {e}")
        return {}, content