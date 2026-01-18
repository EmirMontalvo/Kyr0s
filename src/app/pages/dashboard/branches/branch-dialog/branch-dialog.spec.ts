import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchDialog } from './branch-dialog';

describe('BranchDialog', () => {
  let component: BranchDialog;
  let fixture: ComponentFixture<BranchDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BranchDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
