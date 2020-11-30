import { createSlice, configureStore } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export interface reportItem {
    ProjectUID: string;
    Year: number;
    MonthName: string;
    F03: string;
    F04: string;
    F05: number;
    F06: number;
    F07: number;
    F08: number;
    F09: number;
    F10: number;
    F11: number;
    F12: number;
    F13: number;
    F14: number;
    F15: number;
    F16: number;
    F17: number;
    F18: number;
    
}
export interface listItem {
    ProjectName: string;
    ProjectUID: string;
    
}
export interface taskListItem {
    TaskUID: string;
    ProjectUID: string;
    ParentTaskUID: string;
    TaskName: string;
    TaskWBS: string;
    TaskOutlineLevel: number;
    TaskIndex: number;
    TaskStartDate: string;
    TaskBaselineStartDate: string;
    TaskBaselineFinishDate: string;
    TaskValueCost: number;
    
}
export interface projTaskListItem {
    TaskUID: string;
    ProjectUID: string;
    ParentTaskUID: string;
    TaskName: string;
    TaskWBS: string;
    TaskOutlineLevel: number;
    TaskIndex: number;
    TaskStartDate: string;
    TaskBaselineStartDate: string;
    TaskBaselineFinishDate: string;
    TaskValueCost: number;
    
}



interface IState {
  report: reportItem[];
  list: listItem[];
  taskList: taskListItem[];
  projTaskList: projTaskListItem[];
  year: number;
  month: number;
  ProjectUID: string;
  
}

const counterSlice = createSlice({
  name: 'reportData',
  initialState: {
    report: new Array<reportItem>(),
    list: new Array<listItem>(),
    taskList: new Array<taskListItem>(),
    projTaskList: new Array<projTaskListItem>(),
    year: 0,
    month: 0,
    ProjectUID: "",
    
  },
  reducers: {
    report: (state: IState, action) => {
        state.report = action.payload;
    },
    list: (state: IState, action) => {
        state.list = action.payload;
    },
    taskList: (state: IState, action) => {
        state.taskList = action.payload;
    },
    projTaskList: (state: IState, action) => {
        state.projTaskList = action.payload;
    },
    year: (state: IState, action) => {
        state.year = action.payload;
    },
    month: (state: IState, action) => {
        state.month = action.payload;
    },
    ProjectUID: (state: IState, action) => {
        state.ProjectUID = action.payload;
    },
    
  },
});


const reportStore = configureStore({
  reducer: counterSlice.reducer
});
export { reportStore };

const baseUrl = "http://localhost:3004/datasets";

const load = (dsName: string, params: any) => {
  fetch(`${baseUrl}/${dsName}/data`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }
  )
    .then(res => res.json())
    .then(
      (result) => {
        let actions: any = counterSlice.actions;
        reportStore.dispatch(actions[dsName](result));
      }
    );
}

const data = {
  report: {
      useValue: () => useSelector((state: IState) => state.report),
      refresh: (Year: number,Month: number,) => load("report", {Year,Month,})
  },
  list: {
      useValue: () => useSelector((state: IState) => state.list),
      refresh: () => load("list", {})
  },
  taskList: {
      useValue: () => useSelector((state: IState) => state.taskList),
      refresh: () => load("taskList", {})
  },
  projTaskList: {
      useValue: () => useSelector((state: IState) => state.projTaskList),
      refresh: (ProjectUID: string,) => load("projTaskList", {ProjectUID,})
  },
  year: {
      useValue: () => useSelector((state: IState) => state.year),
      set: (value: number) => reportStore.dispatch(counterSlice.actions.year(value))
  },
  month: {
      useValue: () => useSelector((state: IState) => state.month),
      set: (value: number) => reportStore.dispatch(counterSlice.actions.month(value))
  },
  ProjectUID: {
      useValue: () => useSelector((state: IState) => state.ProjectUID),
      set: (value: string) => reportStore.dispatch(counterSlice.actions.ProjectUID(value))
  },
  
}
export { data }




