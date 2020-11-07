import { GitResolverResult, ResolverContract, ResolverOptions, ResolverResult } from '@/Contracts/ResolverContract';
import { logger } from '@poppinss/cliui';
import { CloneError, ResolutionError } from '@/Errors';
import { injectable } from 'inversify';
import git from 'simple-git';
import tmp from 'tmp';
import path from 'path';
import fs from 'fs-extra';

@injectable()
export class GitHubResolver implements ResolverContract {
  async resolve(resolvable: string, options: ResolverOptions): Promise<ResolverResult> {
    const result = this.resolveGitHubUrl(resolvable);

    if (!result) {
      return false;
    }

    return this.clone({
      ...result,
      path: options.path,
    });
  }

  /**
   * Resolves the short syntax for GitHub.
   *
   * @example organization/repository
   * @example organization/repository(at)tag
   * @example git(at)github.com:organization/repository
   */
  protected resolveGitHubUrl(resolvable: string): GitResolverResult | false {
    const regexes = [
      /^([a-zA-Z][\w-]+)\/([a-zA-Z][\w-]+)(?:@([\w-\.]+))?$/,
      /^git@github\.com:([a-zA-Z][\w-]+)\/([a-zA-Z][\w-]+)(?:\.git)?(?:@([\w-\.]+))?$/,
      /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z][\w-]+)\/([a-zA-Z][\w-]+)(?:\.git)?(?:@([\w-\.]+))?/,
    ];

    // prettier-ignore
    return regexes
			.map((regex) => {
				const [matches, organization, repository, tag] = resolvable.match(regex) ?? [];

				if (!matches) {
					return false;
				}

				return {
					organization,
					repository,
					tag,
					ssh: !resolvable.includes('http')
				};
			})
			.filter(Boolean)
			?.shift() ?? false;
  }

  /**
   * Clones the repository in a temporary directory.
   */
  protected async clone(options: GitResolverResult): Promise<ResolverResult> {
    try {
      // Sets SSH if unspecified
      options.ssh = undefined === options.ssh ? true : options.ssh;

      const temporary = tmp.dirSync();
      const repositoryUrl = options.ssh
        ? `git@github.com:${options.organization}/${options.repository}.git`
        : `https://github.com/${options.organization}/${options.repository}`;

      await git()
        .clone(repositoryUrl, temporary.name, {
          '--single-branch': true,
          ...(options.tag && { '--branch': options.tag }),
        })
        .then(() => logger.debug(`Cloned ${repositoryUrl} into ${temporary.name}.`));

      // Ensure the path exists
      const clonedDirectoryWithPath = path.join(temporary.name, options.path ?? '');
      if (!fs.pathExistsSync(clonedDirectoryWithPath) || !fs.statSync(clonedDirectoryWithPath).isDirectory()) {
        try {
          logger.debug(`Removing "${temporary.name}"`);
          fs.emptyDirSync(temporary.name);
          fs.rmdirSync(temporary.name);
        } catch (error) {
          logger.warning('Could not remove temporary directory.');
          logger.debug(error);
        }

        throw ResolutionError.repositorySubdirectoryNotFound(
          options.path!,
          `${options.organization}/${options.repository}`,
        );
      }

      return {
        temporary: true,
        path: clonedDirectoryWithPath,
      };
    } catch (error) {
      if (error.name === 'ResolutionError') {
        throw error;
      }

      throw new CloneError(options, error);
    }
  }
}
