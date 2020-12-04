
DECLARE @tstep NVARCHAR(100)= @timeStep;

DECLARE @startDate DATE= '2020-01-01';

DECLARE @endDate DATE= '2020-11-01';

DROP TABLE IF EXISTS [#x];

DROP TABLE IF EXISTS [#xs];

DROP TABLE IF EXISTS [#dates];

WITH dt
     AS (SELECT @startDate AS [Date], 
                @endDate AS [MaxDate]
         UNION ALL
         SELECT DATEADD([dd], 1, [Date]), 
                [MaxDate]
         FROM [dt] [s]
         WHERE DATEADD([dd], 1, [Date]) <= [MaxDate]),
     d
     AS (SELECT [Date], 
                CAST(DATEPART(WEEK, [Date]) AS NVARCHAR) [WeekLabel],
                CASE MONTH([Date])
                    WHEN 1
                    THEN N'январь'
                    WHEN 2
                    THEN N'февраль'
                    WHEN 3
                    THEN N'март'
                    WHEN 4
                    THEN N'апрель'
                    WHEN 5
                    THEN N'май'
                    WHEN 6
                    THEN N'июнь'
                    WHEN 7
                    THEN N'июль'
                    WHEN 8
                    THEN N'август'
                    WHEN 9
                    THEN N'сентябрь'
                    WHEN 10
                    THEN N'октябрь'
                    WHEN 11
                    THEN N'ноябрь'
                    WHEN 12
                    THEN N'декабрь'
                END [MonthLabel],
                CASE DATEPART(QUARTER, [Date])
                    WHEN 1
                    THEN N'I'
                    WHEN 2
                    THEN N'II'
                    WHEN 3
                    THEN N'III'
                    WHEN 4
                    THEN N'IV'
                END [QuarterLabel], 
                CAST(YEAR([Date]) AS NVARCHAR) [YearLabel]
         FROM [dt])
     SELECT *,
            CASE @tstep
                WHEN 'Week'
                THEN [WeekLabel]
                WHEN 'Month'
                THEN [MonthLabel]
                WHEN 'Quarter'
                THEN [QuarterLabel]
                WHEN 'Year'
                THEN [YearLabel]
            END AS [XLabel]
     INTO [#dates]
     FROM [d] OPTION(MAXRECURSION 0);

WITH p1
     AS (SELECT 1 AS [IsPlan], 
                [t].[TaskUID] AS [StageUID], 
                [t].[TaskBaselineStartDate] [Start], 
                [t].[TaskBaselineFinishDate] [Finish]
         FROM [data].[DimTask] [t]
              LEFT JOIN [data].[DimProject] [p] ON [p].[ProjectUID] = [t].[ProjectUID]
         WHERE [t].[TaskOutlineLevel] = 1),
     tf
     AS (SELECT [TaskUID], 
                MAX([TaskFinishDate]) [Finish]
         FROM [data].[FactTask]
         WHERE GETDATE() BETWEEN [Date] AND [ValidtoDate]
         GROUP BY [TaskUID]),
     f1
     AS (SELECT 0 AS [IsPlan], 
                [t].[TaskUID] AS [StageUID], 
                [t].[TaskStartDate] [Start], 
                [tf].[Finish]
         FROM [data].[DimTask] [t]
              LEFT JOIN [data].[DimProject] [p] ON [p].[ProjectUID] = [t].[ProjectUID]
              LEFT JOIN [tf] ON [tf].[TaskUID] = [t].[TaskUID]
         WHERE [t].[TaskOutlineLevel] = 1),
     x1
     AS (SELECT *
         FROM [p1]
         UNION ALL
         SELECT *
         FROM [f1]),
     p2
     AS (SELECT 1 AS [IsPlan], 
                [fa].[TaskUID] AS [PositionUID], 
                [fa].[DepartmentName], 
                [fa].[AssignmentBaselineStartDate] [Start], 
                [fa].[AssignmentBaselineFinishDate] [Finish]
         FROM [data].[FactAssignment] [fa]),
     f2
     AS (SELECT 0 AS [IsPlan], 
                [fa].[TaskUID] AS [PositionUID], 
                [fa].[DepartmentName], 
                [fa].[AssignmentStartDate] [Start], 
                [fa].[AssignmentFinishDate] [Finish]
         FROM [data].[FactAssignment] [fa]),
     x2
     AS (SELECT *
         FROM [p2]
         UNION ALL
         SELECT *
         FROM [f2]),
     a2
     AS (SELECT [t].[ParentTaskUID] AS [StageUID], 
                *
         FROM [x2]
              LEFT JOIN [data].[DimTask] [t] ON [t].[TaskUID] = [x2].[PositionUID]),
     x
     AS (SELECT 2 AS [Level], 
                [IsPlan], 
                [StageUID], 
                [PositionUID], 
                [DepartmentName], 
                CAST([Start] AS DATE) AS [Start], 
                CAST([Finish] AS DATE) AS [Finish]
         FROM [a2]
         UNION ALL
         SELECT 1 AS [Level], 
                [IsPlan], 
                [StageUID], 
                NULL AS [PositionUID], 
                NULL AS [DepartmentName], 
                CAST([Start] AS DATE) AS [Start], 
                CAST([Finish] AS DATE) AS [Finish]
         FROM [x1]),
     xx
     AS (SELECT [st].[ProjectUID], 
                [p].[ProjectName], 
                [st].[TaskName] AS [StageName], 
                [st].[TaskWBS] AS [StageNumber], 
                [pt].[TaskName] AS [PositionName], 
                [x].*
         FROM [x]
              LEFT JOIN [data].[DimTask] [pt] ON [pt].[TaskUID] = [x].[PositionUID]
              LEFT JOIN [data].[DimTask] [st] ON [st].[TaskUID] = [x].[StageUID]
              LEFT JOIN [data].[DimProject] [p] ON [p].[ProjectUID] = [st].[ProjectUID]
         WHERE [Start] IS NOT NULL),
     xxd
     AS (SELECT *
         FROM [xx] [x]
              RIGHT JOIN [#dates] [d] ON [d].[Date] BETWEEN [x].[Start] AND [x].[Finish])
     SELECT [x].[Level], 
            [x].[IsPlan], 
            [x].[ProjectUID], 
            [x].[StageUID], 
            [x].[PositionUID], 
            [x].[DepartmentName], 
            [x].[XLabel], 
            MAX([x].[ProjectName]) [ProjectName], 
            MAX([x].[StageName]) [StageName], 
            MAX([x].[StageNumber]) [StageNumber], 
            MAX([x].[PositionName]) [PositionName], 
            MAX([YearLabel]) [YearLabel], 
            MAX([MonthLabel]) [MonthLabel], 
            MAX([QuarterLabel]) [QuarterLabel], 
            MAX([WeekLabel]) [WeekLabel], 
            MAX([Date]) [Date],
            CASE
                WHEN [Level] = 1 -- на уровне проекта если в один временной диапазон попадают несколко этапов делается перенос на след строку
                THEN DENSE_RANK() OVER(PARTITION BY [Level], 
                                                    [ProjectUID], 
                                                    [XLabel]
                        ORDER BY MAX([StageNumber]))
                ELSE 1
            END [RowNum]
     FROM [xxd] [x]
     GROUP BY [x].[Level], 
              [x].[IsPlan], 
              [x].[ProjectUID], 
              [x].[StageUID], 
              [x].[PositionUID], 
              [x].[DepartmentName], 
              [x].[XLabel];
