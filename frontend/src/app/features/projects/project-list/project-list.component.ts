import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectsService } from '../projects.service';
import { Project } from '../../../shared/models/project.model';


@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.css'
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    console.log('ProjectListComponent: Loading projects...');
    this.loading = true;
    this.error = null;
    this.projectsService.getProjects().subscribe({
      next: (projects) => {
        console.log('ProjectListComponent: loadProjects success', projects);
        this.ngZone.run(() => {
          this.projects = projects;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('ProjectListComponent: loadProjects failed', err);
        this.ngZone.run(() => {
          this.error = err.error?.detail || 'Failed to load projects';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  deleteProject(id: string): void {
    if (!confirm('Are you sure you want to delete this project? This will also delete all environments and deployments.')) {
      return;
    }

    this.projectsService.deleteProject(id).subscribe({
      next: () => {
        console.log('ProjectListComponent: deleteProject success', id);
        this.loadProjects();
      },
      error: (err) => {
        console.error('ProjectListComponent: deleteProject failed', err);
        this.ngZone.run(() => {
          this.error = err.error?.detail || 'Failed to delete project.';
          this.cdr.detectChanges();
        });
      }
    });
  }
}
