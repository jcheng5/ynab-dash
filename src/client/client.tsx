import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import * as ynab from "ynab";

interface BudgetMeta {
  readonly userId: string;
  readonly budgetId: string;
  readonly categoryGroups: ReadonlyArray<CategoryGroup>;
}

interface CategoryGroup {
  readonly name: string;
  readonly id: string;
  readonly categories: ReadonlyArray<Category>;
}

interface Category {
  readonly name: string;
  readonly id: string;
}

interface CategorySummary {
  readonly date: Date;
  readonly budgeted: number;
  readonly activity: number;
  readonly balance: number;
  readonly starting: number;
}

interface BudgetMetaProps {
  budget: BudgetMeta;
}

interface SelectionStateProps {
  selection: ReadonlyArray<string>;
  selectionSummaries: Record<string, CategorySummary>;
}

interface OnCategoryChangeProps {
  oncategorychange: (
    userId: string,
    budgetId: string,
    categoryId: string,
    selected: boolean
  ) => void;
}

function CategoryDisplay({
  categoryId,
  summary,
  budget,
  oncategorychange,
}: { categoryId: string; summary: CategorySummary } & BudgetMetaProps &
  OnCategoryChangeProps) {
  const categories = budget.categoryGroups.flatMap((cg) =>
    cg.categories.filter((cat) => cat.id === categoryId)
  );
  if (categories.length === 0) {
    return null;
  }
  const category = categories[0];

  let elapsed: number;
  const now = new Date();
  const monthFirst = new Date(now.getFullYear(), now.getMonth());
  if (summary.date.getTime() !== monthFirst.getTime()) {
    if (summary.date < monthFirst) {
      elapsed = 1;
    } else {
      elapsed = 0;
    }
  } else {
    const monthLast = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    elapsed = (now.getDate() - 1) / (monthLast.getDate() - 1);
  }

  const used = -summary.activity / summary.starting;
  const status =
    used > 1 ? "bg-danger text-light" : used > elapsed ? "bg-warning" : null;

  return (
    <tr key={category.id} className={status}>
      <th>{category.name}</th>
      <td>
        {summary.starting === 0 ? (
          <span className="text-muted fst-italic">(Not budgeted)</span>
        ) : (
          `${(used * 100).toFixed(1)}%`
        )}
      </td>
      <td>{(elapsed * 100).toFixed(1)}%</td>
    </tr>
  );
}

function CategoryGroupChoice({
  group,
  budget,
  selection,
  selectionSummaries,
  oncategorychange,
}: { group: CategoryGroup } & BudgetMetaProps &
  SelectionStateProps &
  OnCategoryChangeProps) {
  if (group.categories.length === 0) {
    return null;
  }

  return (
    <div key={group.id} className="mb-3">
      <h6>{group.name}</h6>
      {group.categories.map((cat) => {
        const id = `checkbox-cat-${cat.id}`;
        return (
          <div key={cat.id} className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              value={cat.id}
              name="categories"
              id={id}
              checked={selection.includes(cat.id)}
              onChange={(e) => {
                oncategorychange(
                  budget.userId,
                  budget.budgetId,
                  cat.id,
                  e.target.checked
                );
              }}
            />
            <label className="form-check-label" htmlFor={id}>
              {cat.name}
            </label>
          </div>
        );
      })}
    </div>
  );
}

function BudgetChooser({
  budget,
  selection,
  selectionSummaries,
  oncategorychange,
}: BudgetMetaProps & SelectionStateProps & OnCategoryChangeProps) {
  const [show, setShow] = useState<boolean>(false);

  return (
    <>
      <a
        className="btn btn-sm btn-default"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setShow(true);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          className="bi bi-gear me-1"
          viewBox="0 0 16 16"
        >
          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" />
        </svg>
        Choose categories
      </a>
      <a className="btn btn-sm btn-default ms-3" href="logout">
        Logout
      </a>
      {show && (
        <>
          <div className="modal-backdrop show"></div>
          <div
            className="modal show"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShow(false);
            }}
            tabIndex={-1}
            role="dialog"
            style={{ display: "block" }}
          >
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Choose categories</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => {
                      setShow(false);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  {budget.categoryGroups.map((cg) => (
                    <CategoryGroupChoice
                      key={cg.id}
                      group={cg}
                      budget={budget}
                      selection={selection}
                      selectionSummaries={selectionSummaries}
                      oncategorychange={oncategorychange}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function App({
  budget,
  selection,
  selectionSummaries,
  oncategorychange,
}: BudgetMetaProps & SelectionStateProps & OnCategoryChangeProps) {
  return (
    <div>
      <table className="table" style={{ width: "fit-content" }}>
        <thead>
          <tr>
            <th>Category</th>
            <th>Spent</th>
            <th>Elapsed</th>
          </tr>
        </thead>
        <tbody>
          {selection.map((catId) => (
            <CategoryDisplay
              key={catId}
              categoryId={catId}
              summary={selectionSummaries[catId]!}
              budget={budget}
              oncategorychange={oncategorychange}
            />
          ))}
        </tbody>
      </table>
      <BudgetChooser
        budget={budget}
        selection={selection}
        selectionSummaries={selectionSummaries}
        oncategorychange={oncategorychange}
      />
    </div>
  );
}

async function getBudgetMeta(): Promise<BudgetMeta> {
  const resp = await ynabFetch<ynab.UserResponse>("/user");
  const userId = resp.data.user.id;

  const budgetResp = await ynabFetch<ynab.BudgetDetailResponse>(
    "/budgets/default"
  );
  const budgetId = budgetResp.data.budget.id;

  const categoriesResp = await ynabFetch<ynab.CategoriesResponse>(
    "/budgets/default/categories"
  );
  const categoryGroups: CategoryGroup[] =
    categoriesResp.data.category_groups.map((group) => {
      return {
        name: group.name,
        id: group.id,
        categories: group.categories
          .filter((category) => !category.hidden)
          .map((category) => {
            return {
              name: category.name,
              id: category.id,
            };
          }),
      };
    });

  const budgetState: BudgetMeta = {
    userId,
    budgetId,
    categoryGroups,
  };

  return budgetState;
}

let budgetState;
let storageKey;
async function refresh() {
  if (!budgetState) {
    budgetState = await getBudgetMeta();

    const { userId, budgetId } = budgetState;
    storageKey = `config/${userId}/${budgetId}/selected-categories`;

    // Refresh when other windows modify the selection list
    window.addEventListener("storage", (e) => {
      if (e.key === storageKey) {
        refresh();
      }
    });
  }

  const selectedCategories: ReadonlyArray<string> = JSON.parse(
    localStorage.getItem(storageKey) ?? "[]"
  );

  const selectionSummaries: Record<string, CategorySummary> = {};

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${now.getMonth() + 1}-01`;
  const month = await ynabFetch<ynab.MonthDetailResponse>(
    `/budgets/${budgetState.budgetId}/months/${thisMonth}`
  );
  month.data.month.categories.map((cat) => {
    const budgeted = cat.budgeted / 1000,
      activity = cat.activity / 1000,
      balance = cat.balance / 1000,
      starting = balance - activity;
    const match = /^(\d\d\d\d)-(\d\d)-01$/.exec(month.data.month.month);
    if (!match) {
      throw new Error(`Unexpected month format: ${month.data.month.month}`);
    }
    selectionSummaries[cat.id] = {
      // This is needed to make sure the date is interepreted as local time
      date: new Date(+match[1], +match[2] - 1),
      budgeted,
      activity,
      balance,
      starting,
    };
  });

  ReactDOM.render(
    <App
      budget={budgetState}
      selection={selectedCategories}
      selectionSummaries={selectionSummaries}
      oncategorychange={onCategoryChange}
    />,
    document.getElementById("container")
  );
}

function onCategoryChange(
  userId: string,
  budgetId: string,
  categoryId: string,
  selected: boolean
) {
  let categories: Array<string> = JSON.parse(
    localStorage.getItem(storageKey) ?? "[]"
  );
  if (!Array.isArray(categories)) {
    categories = [];
  }

  categories = categories.filter((x) => x !== categoryId);
  if (selected) {
    categories.push(categoryId);
  }
  localStorage.setItem(storageKey, JSON.stringify(categories));
  refresh();
}

async function ynabFetch<T>(url: string): Promise<T> {
  const resp = await fetch("/api" + url);
  const body = await resp.json();
  if (body.error) {
    throw new Error(body.error.detail);
  }
  return body as T;
}

refresh();
setInterval(() => {
  refresh();
}, 1000 * 60 * 15);
